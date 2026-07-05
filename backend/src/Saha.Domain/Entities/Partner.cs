using Saha.Domain.Enums;
using Saha.Domain.Exceptions;
using Saha.Domain.ValueObjects;

namespace Saha.Domain.Entities;

public sealed class Partner : Entity
{
    public string Username { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public DateTime DateOfBirth { get; private set; }
    public string Email { get; private set; } = default!;
    public string PhoneNumber { get; private set; } = default!;
    public string? ProfilePictureUrl { get; private set; }
    public PartnerRole Role { get; private set; }
    public Guid CoupleId { get; private set; }

    private Partner() { }

    public static Partner Create(
        string username,
        string name,
        DateTime dateOfBirth,
        string email,
        string phoneNumber,
        PartnerRole role,
        Guid coupleId)
    {
        var validatedUsername = ValueObjects.Username.Create(username);
        var validatedEmail = EmailAddress.Create(email);
        var validatedPhone = ValueObjects.PhoneNumber.Create(phoneNumber);

        ValidateName(name);
        ValidateDateOfBirth(dateOfBirth);

        return new Partner
        {
            Id = Guid.NewGuid(),
            Username = validatedUsername.Value,
            Name = name.Trim(),
            DateOfBirth = dateOfBirth.Date,
            Email = validatedEmail.Value,
            PhoneNumber = validatedPhone.Value,
            Role = role,
            CoupleId = coupleId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void UpdateProfile(string name, DateTime dateOfBirth, string email, string phoneNumber)
    {
        var validatedEmail = EmailAddress.Create(email);
        var validatedPhone = ValueObjects.PhoneNumber.Create(phoneNumber);

        ValidateName(name);
        ValidateDateOfBirth(dateOfBirth);

        Name = name.Trim();
        DateOfBirth = dateOfBirth.Date;
        Email = validatedEmail.Value;
        PhoneNumber = validatedPhone.Value;
        UpdateTimestamp();
    }

    public void SetProfilePictureUrl(string? url)
    {
        ProfilePictureUrl = url;
        UpdateTimestamp();
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainValidationException(nameof(Name), "Name cannot be empty.");

        if (name.Trim().Length > 100)
            throw new DomainValidationException(nameof(Name), "Name cannot exceed 100 characters.");
    }

    private static void ValidateDateOfBirth(DateTime dob)
    {
        var today = DateTime.UtcNow.Date;
        var minDob = today.AddYears(-120);
        var maxDob = today.AddYears(-16);

        if (dob.Date > maxDob)
            throw new DomainValidationException(nameof(DateOfBirth), "Partner must be at least 16 years old.");

        if (dob.Date < minDob)
            throw new DomainValidationException(nameof(DateOfBirth), "Date of birth is not valid.");
    }
}
